import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminSessionTransformer } from "../transformers/ShoppingMallAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminAdminsAdminIdSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  // Step 1: Verify admin exists and is not deleted
  await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Find the session belonging to the specified admin
  const session =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        shopping_mall_admin_id: props.adminId,
      },
      ...ShoppingMallAdminSessionTransformer.select(),
    });
  // Step 3: Transform and return
  return ShoppingMallAdminSessionTransformer.transform(session);
}
