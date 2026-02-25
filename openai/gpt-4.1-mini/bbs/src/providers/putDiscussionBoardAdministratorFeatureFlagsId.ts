import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardFeatureFlagTransformer } from "../transformers/DiscussionBoardFeatureFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorFeatureFlagsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardFeatureFlag.IUpdate;
}): Promise<IDiscussionBoardFeatureFlag> {
  // Check existence, throw 404 if not found
  await MyGlobal.prisma.discussion_board_feature_flags.findUniqueOrThrow({
    where: { id: props.id },
  });
  // Update with provided partial fields
  const updated = await MyGlobal.prisma.discussion_board_feature_flags.update({
    where: { id: props.id },
    data: {
      ...(props.body.code !== undefined && { code: props.body.code }),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.enabled !== undefined && { enabled: props.body.enabled }),
      updated_at: new Date(),
    },
  });
  // Use transformer to convert DB record to DTO
  return await DiscussionBoardFeatureFlagTransformer.transform(updated);
}
