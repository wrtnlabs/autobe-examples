import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
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

export async function patchMallPlatformAdministratorPasswordResets(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCustomerPasswordReset.IUpdate;
}): Promise<void> {
  const customerReset =
    await MyGlobal.prisma.mall_platform_customer_password_resets.findFirst({
      where: {
        token: props.body.currentPassword,
        used_at: null,
        deleted_at: null,
      },
      select: {
        id: true,
        expired_at: true,
        customer: {
          select: {
            id: true,
          },
        },
      },
    });
  if (customerReset !== null) {
    if (customerReset.expired_at.getTime() <= Date.now()) {
      throw new HttpException("Reset token expired.", 409);
    }
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.mall_platform_customers.update({
        where: {
          id: customerReset.customer.id,
        },
        data: {
          password_hash: await PasswordUtil.hash(props.body.newPassword),
          updated_at: customerReset.expired_at,
        },
      });
      await prisma.mall_platform_customer_password_resets.update({
        where: {
          id: customerReset.id,
        },
        data: {
          used_at: customerReset.expired_at,
          updated_at: customerReset.expired_at,
        },
      });
    });
    return;
  }
  const sellerReset =
    await MyGlobal.prisma.mall_platform_seller_password_resets.findFirst({
      where: {
        reset_token: props.body.currentPassword,
        consumed_at: null,
        deleted_at: null,
      },
      select: {
        id: true,
        expired_at: true,
        seller_account_id: true,
      },
    });
  if (sellerReset !== null) {
    if (sellerReset.expired_at.getTime() <= Date.now()) {
      throw new HttpException("Reset token expired.", 409);
    }
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.mall_platform_sellers.update({
        where: {
          id: sellerReset.seller_account_id,
        },
        data: {
          password_hash: await PasswordUtil.hash(props.body.newPassword),
          updated_at: sellerReset.expired_at,
        },
      });
      await prisma.mall_platform_seller_password_resets.update({
        where: {
          id: sellerReset.id,
        },
        data: {
          consumed_at: sellerReset.expired_at,
          updated_at: sellerReset.expired_at,
        },
      });
    });
    return;
  }
  const administratorReset =
    await MyGlobal.prisma.mall_platform_administrator_password_resets.findFirst(
      {
        where: {
          token: props.body.currentPassword,
          deleted_at: null,
        },
        select: {
          id: true,
          expired_at: true,
          administrator_id: true,
        },
      },
    );
  if (administratorReset !== null) {
    if (administratorReset.expired_at.getTime() <= Date.now()) {
      throw new HttpException("Reset token expired.", 409);
    }
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.mall_platform_administrators.update({
        where: {
          id: administratorReset.administrator_id,
        },
        data: {
          password_hash: await PasswordUtil.hash(props.body.newPassword),
          updated_at: administratorReset.expired_at,
        },
      });
      await prisma.mall_platform_administrator_password_resets.update({
        where: {
          id: administratorReset.id,
        },
        data: {
          deleted_at: administratorReset.expired_at,
          updated_at: administratorReset.expired_at,
        },
      });
    });
    return;
  }
  throw new HttpException("Reset token not found.", 404);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorPasswordResets(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformCustomerPasswordReset.IUpdate;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------