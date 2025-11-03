import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import { IPageIShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminAppeals(props: {
  admin: AdminPayload;
  body: IShoppingAppeal.IRequest;
}): Promise<IPageIShoppingAppeal.ISummary> {
  const { page = 1, limit = 20 } = props.body;
  const safePage = typeof page === "number" && page > 0 ? page : 1;
  const safeLimit =
    typeof limit === "number" && limit > 0 && limit <= 100 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;

  const allowedSortFields = ["created_at", "status", "decision_at"];
  const sort_by =
    props.body.sort_by && allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sort_direction: "asc" | "desc" =
    props.body.sort_direction === "asc" || props.body.sort_direction === "desc"
      ? props.body.sort_direction
      : "desc";

  // Build where clause
  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.type !== undefined &&
      props.body.type !== null &&
      {
        /* ignore: no type field in DB, filter by presence below */
      }),
    ...(props.body.decision !== undefined &&
      props.body.decision !== null && { decision: props.body.decision }),
    ...(props.body.filer_actor_type !== undefined &&
      props.body.filer_actor_type !== null &&
      {
        /* ignore in DB */
      }),
    ...(props.body.filer_actor_id !== undefined &&
      props.body.filer_actor_id !== null && {
        OR: [
          { filed_by_admin_id: props.body.filer_actor_id },
          { filed_by_seller_id: props.body.filer_actor_id },
          { filed_by_customer_id: props.body.filer_actor_id },
        ],
      }),
    ...(props.body.affected_actor_type !== undefined &&
      props.body.affected_actor_type !== null &&
      {
        /* ignore in DB */
      }),
    ...(props.body.affected_actor_id !== undefined &&
      props.body.affected_actor_id !== null &&
      {
        /* ignore in DB */
      }),
    ...(props.body.appeal_of_policy_violation_id !== undefined &&
      props.body.appeal_of_policy_violation_id !== null && {
        appeal_of_policy_violation_id: props.body.appeal_of_policy_violation_id,
      }),
    ...(props.body.appeal_of_suspension_id !== undefined &&
      props.body.appeal_of_suspension_id !== null && {
        appeal_of_suspension_id: props.body.appeal_of_suspension_id,
      }),
    ...(props.body.created_from || props.body.created_to
      ? {
          created_at: {
            ...(props.body.created_from
              ? { gte: props.body.created_from }
              : {}),
            ...(props.body.created_to ? { lte: props.body.created_to } : {}),
          },
        }
      : {}),
    ...(props.body.decision_from || props.body.decision_to
      ? {
          decision_at: {
            ...(props.body.decision_from
              ? { gte: props.body.decision_from }
              : {}),
            ...(props.body.decision_to ? { lte: props.body.decision_to } : {}),
          },
        }
      : {}),
    ...(props.body.search && props.body.search.length > 0
      ? {
          OR: [
            { reason: { contains: props.body.search } },
            // decision_reason is not in DB, so leave out
          ],
        }
      : {}),
  };

  const [appeals, total] = await Promise.all([
    MyGlobal.prisma.shopping_appeals.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    MyGlobal.prisma.shopping_appeals.count({ where }),
  ]);

  const data: IShoppingAppeal.ISummary[] = appeals.map((a) => {
    // type inference: policy_violation > suspension > account_action
    let summaryType: string =
      a.appeal_of_policy_violation_id !== null
        ? "policy_violation"
        : a.appeal_of_suspension_id !== null
          ? "suspension"
          : "account_action";
    // filer_actor_type/id: from whichever field is set
    let filer_actor_type = "";
    let filer_actor_id: string & tags.Format<"uuid"> = "" as string &
      tags.Format<"uuid">;
    if (a.filed_by_admin_id) {
      filer_actor_type = "admin";
      filer_actor_id = a.filed_by_admin_id as string & tags.Format<"uuid">;
    } else if (a.filed_by_seller_id) {
      filer_actor_type = "seller";
      filer_actor_id = a.filed_by_seller_id as string & tags.Format<"uuid">;
    } else if (a.filed_by_customer_id) {
      filer_actor_type = "customer";
      filer_actor_id = a.filed_by_customer_id as string & tags.Format<"uuid">;
    }
    // affected_actor_type/id cannot be directly derived, return empty values
    // decision_reason is not in DB -- return empty string
    return {
      id: a.id as string & tags.Format<"uuid">,
      status: a.status,
      type: summaryType,
      reason: a.reason,
      filer_actor_type,
      filer_actor_id,
      affected_actor_type: "", // cannot be inferred from shopping_appeals directly
      affected_actor_id: "" as string & tags.Format<"uuid">, // cannot be inferred directly
      decision: a.decision ?? null,
      decision_reason: "", // not present in DB
      created_at: toISOStringSafe(a.created_at),
      updated_at: toISOStringSafe(a.updated_at),
      decision_at: a.decision_at ? toISOStringSafe(a.decision_at) : null,
      appeal_of_policy_violation_id: a.appeal_of_policy_violation_id ?? null,
      appeal_of_suspension_id: a.appeal_of_suspension_id ?? null,
    };
  });

  const totalPages = Math.ceil(total / safeLimit);
  return {
    pagination: {
      current: Number(safePage),
      limit: Number(safeLimit),
      records: Number(total),
      pages: Number(totalPages),
    },
    data,
  };
}
