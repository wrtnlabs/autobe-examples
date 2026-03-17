import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberEmailVerificationAtSummaryTransformer } from "../transformers/TodoAppMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ITodoAppMemberEmailVerification.IRequest;
}): Promise<IPageITodoAppMemberEmailVerification.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const now = new Date();
  const where = {
    todo_app_member_id: props.member.id,
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          token: {
            contains: props.body.search,
          },
        }
      : {}),
    ...(props.body.state === "used"
      ? {
          used_at: {
            not: null,
          },
        }
      : props.body.state === "revoked"
        ? {
            revoked_at: {
              not: null,
            },
          }
        : props.body.state === "expired"
          ? {
              used_at: null,
              revoked_at: null,
              expired_at: {
                lte: now,
              },
            }
          : props.body.state === "active"
            ? {
                used_at: null,
                revoked_at: null,
                expired_at: {
                  gt: now,
                },
              }
            : {}),
  } satisfies Prisma.todo_app_member_email_verificationsWhereInput;
  const orderBy =
    props.body.sort === "created_at_asc"
      ? ({
          created_at: "asc",
        } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput)
      : props.body.sort === "updated_at_desc"
        ? ({
            updated_at: "desc",
          } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput)
        : props.body.sort === "updated_at_asc"
          ? ({
              updated_at: "asc",
            } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput)
          : props.body.sort === "expired_at_desc"
            ? ({
                expired_at: "desc",
              } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput)
            : props.body.sort === "expired_at_asc"
              ? ({
                  expired_at: "asc",
                } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput)
              : ({
                  created_at: "desc",
                } satisfies Prisma.todo_app_member_email_verificationsOrderByWithRelationInput);
  const records =
    await MyGlobal.prisma.todo_app_member_email_verifications.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...TodoAppMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.todo_app_member_email_verifications.count(
    {
      where,
    },
  );
  return {
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppMemberEmailVerificationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
