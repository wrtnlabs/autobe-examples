import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardFeatureFlagTransformer } from "../transformers/DiscussionBoardFeatureFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorFeatureFlagsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardFeatureFlag> {
  const record =
    await MyGlobal.prisma.discussion_board_feature_flags.findUniqueOrThrow({
      where: { id: props.id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return await DiscussionBoardFeatureFlagTransformer.transform(record);
}
