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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardFeatureFlagTransformer } from "../transformers/DiscussionBoardFeatureFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorFeatureFlags(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardFeatureFlag.ICreate;
}): Promise<IDiscussionBoardFeatureFlag> {
  // Collect create payload
  const data = await DiscussionBoardFeatureFlagCollector.collect({
    body: props.body,
  });
  // Insert record
  const created = await MyGlobal.prisma.discussion_board_feature_flags.create({
    data,
    ...DiscussionBoardFeatureFlagTransformer.select(),
  });
  // Transform and return
  return await DiscussionBoardFeatureFlagTransformer.transform(created);
}
