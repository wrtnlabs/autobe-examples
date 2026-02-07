import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallSuperAdminFeatureFlagsFeatureFlagId(props: {
  superAdmin: SuperadminPayload;
  featureFlagId: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_systematic_feature_flags.findUnique({
      where: { id: props.featureFlagId },
    });
  if (existing === null) {
    throw new HttpException("Feature flag not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_systematic_feature_flags.delete({
    where: { id: props.featureFlagId },
  });
}
