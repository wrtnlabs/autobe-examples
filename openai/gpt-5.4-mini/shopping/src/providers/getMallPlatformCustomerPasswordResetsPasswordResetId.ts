import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformAdministratorPasswordResetTransformer } from "../transformers/MallPlatformAdministratorPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerPasswordResetsPasswordResetId(props: {
  customer: CustomerPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformAdministratorPasswordReset> {
  const passwordReset =
    await MyGlobal.prisma.mall_platform_administrator_password_resets.findUniqueOrThrow(
      {
        where: {
          id: props.passwordResetId,
        },
        ...MallPlatformAdministratorPasswordResetTransformer.select(),
      },
    );
  if (passwordReset.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await MallPlatformAdministratorPasswordResetTransformer.transform(
    passwordReset,
  );
}
