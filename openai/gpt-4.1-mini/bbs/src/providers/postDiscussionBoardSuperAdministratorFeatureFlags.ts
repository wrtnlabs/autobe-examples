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
import { DiscussionBoardFeatureFlagTransformer } from "../transformers/DiscussionBoardFeatureFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorFeatureFlags(props: {
  superAdministrator: SuperadministratorPayload;
  body: IDiscussionBoardFeatureFlag.ICreate;
}): Promise<IDiscussionBoardFeatureFlag> {
  // Check uniqueness of code
  const existing =
    await MyGlobal.prisma.discussion_board_feature_flags.findUnique({
      where: { code: props.body.code },
    });
  if (existing !== null) {
    throw new HttpException(
      `Feature flag code '${props.body.code}' already exists.`,
      409,
    );
  }
  // Prepare the data object via collector
  const data = await DiscussionBoardFeatureFlagCollector.collect({
    body: props.body,
  });
  // Create new feature flag
  const created = await MyGlobal.prisma.discussion_board_feature_flags.create({
    data,
    ...DiscussionBoardFeatureFlagTransformer.select(),
  });
  // Transform to API DTO
  return await DiscussionBoardFeatureFlagTransformer.transform(created);
}
