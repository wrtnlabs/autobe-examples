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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorFeatureFlagsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardFeatureFlag> {
  const featureFlag =
    await MyGlobal.prisma.discussion_board_feature_flags.findUnique({
      where: { id: props.id },
    });
  if (!featureFlag) throw new HttpException("Feature flag not found", 404);
  return featureFlag;
}
