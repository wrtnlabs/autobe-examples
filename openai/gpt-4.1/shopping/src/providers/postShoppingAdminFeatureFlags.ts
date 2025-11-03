import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminFeatureFlags(props: {
  admin: AdminPayload;
  body: IShoppingFeatureFlag.ICreate;
}): Promise<IShoppingFeatureFlag> {
  // Check for existing flag_name that is not soft-deleted
  const exists = await MyGlobal.prisma.shopping_feature_flags.findFirst({
    where: { flag_name: props.body.flag_name, deleted_at: null },
    select: { id: true },
  });
  if (exists) {
    throw new HttpException(
      "Feature flag with this flag_name already exists",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_feature_flags.create({
    data: {
      id: v4(),
      flag_name: props.body.flag_name,
      scope: props.body.scope,
      enabled: props.body.enabled,
      rollout: props.body.rollout ?? null,
      description: props.body.description,
      created_at: now,
      updated_at: now,
      // deleted_at unset on creation
    },
  });
  return {
    id: created.id,
    flag_name: created.flag_name,
    scope: created.scope,
    enabled: created.enabled,
    rollout: created.rollout === null ? null : created.rollout,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
