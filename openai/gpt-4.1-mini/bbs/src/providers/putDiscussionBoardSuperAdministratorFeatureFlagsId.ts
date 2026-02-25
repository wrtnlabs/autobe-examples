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

export async function putDiscussionBoardSuperAdministratorFeatureFlagsId(props: {
  superAdministrator: SuperadministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardFeatureFlag.IUpdate;
}): Promise<IDiscussionBoardFeatureFlag> {
  const featureFlag =
    await MyGlobal.prisma.discussion_board_feature_flags.findUnique({
      where: { id: props.id },
      select: { id: true, deleted_at: true },
    });
  if (featureFlag === null || featureFlag.deleted_at !== null) {
    throw new HttpException("Feature flag not found", 404);
  }
  const updateData: Prisma.discussion_board_feature_flagsUpdateInput = {
    ...(props.body.code !== undefined && { code: props.body.code }),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.enabled !== undefined && { enabled: props.body.enabled }),
  };
  const updatedFeatureFlag =
    await MyGlobal.prisma.discussion_board_feature_flags.update({
      where: { id: props.id },
      data: updateData,
      ...DiscussionBoardFeatureFlagTransformer.select(),
    });
  return await DiscussionBoardFeatureFlagTransformer.transform(
    updatedFeatureFlag,
  );
}
