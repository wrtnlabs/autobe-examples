import { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSystemActivities(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemActivity.IRequest;
}): Promise<IPageIDiscussionBoardSystemActivity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions without Date constructor
  const whereConditions: Prisma.discussion_board_system_activitiesWhereInput = {
    ...(props.body.start_date && {
      created_at: {
        gte: props.body.start_date,
      },
    }),
    ...(props.body.end_date && {
      created_at: {
        lte: props.body.end_date,
      },
    }),
    ...(props.body.activity_type && {
      activity_type: props.body.activity_type,
    }),
  } satisfies Prisma.discussion_board_system_activitiesWhereInput;
  // Get paginated data with proper actor resolution
  const data =
    await MyGlobal.prisma.discussion_board_system_activities.findMany({
      where: whereConditions,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        activity_type: true,
        target_entity_type: true,
        target_entity_id: true,
        success_status: true,
        created_at: true,
        user: {
          select: {
            display_name: true,
          },
        },
        admin: {
          select: {
            display_name: true,
          },
        },
        superAdmin: {
          select: {
            email: true,
          },
        },
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_system_activities.count({
    where: whereConditions,
  });
  // Transform data to match ISummary schema
  const transformedData: IDiscussionBoardSystemActivity.ISummary[] = data.map(
    (activity) => {
      let actorDisplayName = "Unknown";
      if (activity.superAdmin?.email) {
        actorDisplayName = activity.superAdmin.email;
      } else if (activity.admin?.display_name) {
        actorDisplayName = activity.admin.display_name;
      } else if (activity.user?.display_name) {
        actorDisplayName = activity.user.display_name;
      }
      return {
        id: activity.id as string & tags.Format<"uuid">,
        activity_type: activity.activity_type,
        target_entity_type: activity.target_entity_type,
        target_entity_id: activity.target_entity_id
          ? (activity.target_entity_id as string & tags.Format<"uuid">)
          : null,
        actor_display_name: actorDisplayName,
        success_status: activity.success_status,
        created_at: toISOStringSafe(activity.created_at),
      };
    },
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data: transformedData,
    pagination: pagination,
  };
}
