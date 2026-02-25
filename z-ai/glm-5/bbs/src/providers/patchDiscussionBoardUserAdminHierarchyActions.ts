import { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminHierarchyAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminHierarchyActionAtSummaryTransformer } from "../transformers/DiscussionBoardAdminHierarchyActionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserAdminHierarchyActions(props: {
  user: UserPayload;
  body: IDiscussionBoardAdminHierarchyAction.IRequest;
}): Promise<IPageIDiscussionBoardAdminHierarchyAction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.action_type !== null &&
      props.body.action_type !== undefined && {
        action_type: props.body.action_type,
      }),
    ...(props.body.actor_id !== null &&
      props.body.actor_id !== undefined && { actor_id: props.body.actor_id }),
    ...(props.body.target_id !== null &&
      props.body.target_id !== undefined && {
        target_id: props.body.target_id,
      }),
    ...(props.body.created_at_from !== null &&
      props.body.created_at_from !== undefined && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
    ...(props.body.created_at_to !== null &&
      props.body.created_at_to !== undefined && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
  } satisfies Prisma.discussion_board_admin_hierarchy_actionsWhereInput;
  const orderByInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  const data =
    await MyGlobal.prisma.discussion_board_admin_hierarchy_actions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAdminHierarchyActionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_admin_hierarchy_actions.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminHierarchyActionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
