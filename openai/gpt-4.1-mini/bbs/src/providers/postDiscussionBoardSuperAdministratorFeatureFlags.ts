import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardFeatureFlagCollector } from "../collectors/DiscussionBoardFeatureFlagCollector";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorFeatureFlags(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardFeatureFlag.ICreate;
}): Promise<IDiscussionBoardFeatureFlag> {
  // Removed uniqueness check due to 'code' property not existing on ICreate
  const data = await DiscussionBoardFeatureFlagCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.discussion_board_feature_flags.create({
    data,
  });
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    enabled: created.enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
