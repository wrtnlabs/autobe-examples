import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAuthCustomerRefresh(props: {
  body: IEcommerceCustomer.IRefresh;
}): Promise<IEcommerceCustomer.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "customer";
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    try {
      try {
        try {
        } catch {
          throw new HttpException("Invalid or expired refresh token", 401);
        }
        if (decoded.type !== "customer") {
          throw new HttpException("Invalid token type", 403);
        }
        const session =
          await MyGlobal.prisma.ecommerce_customer_sessions.findFirst({
            where: {
              id: decoded.session_id,
            },
          });
        if (!session) {
          throw new HttpException("Session not found", 404);
        }
        const customer =
          await MyGlobal.prisma.ecommerce_customers.findUniqueOrThrow({
            where: { id: decoded.id },
          });
        if (customer.deleted_at !== null) {
          throw new HttpException("Account has been deleted", 403);
        }
        const currentDate = new Date();
        const accessExpires = new Date(currentDate.getTime() + 60 * 60 * 1000);
        const refreshExpires = new Date(
          currentDate.getTime() + 7 * 24 * 60 * 60 * 1000,
        );
        const accessToken = jwt.sign(
          {
            type: "customer",
            id: decoded.id,
            session_id: decoded.session_id,
            created_at: toISOStringSafe(currentDate),
          },
          MyGlobal.env.JWT_SECRET_KEY,
          { expiresIn: "1h", issuer: "autobe" },
        );
        const refreshToken = jwt.sign(
          {
            type: "customer",
            id: decoded.id,
            session_id: decoded.session_id,
            tokenType: "refresh",
            created_at: toISOStringSafe(currentDate),
          },
          MyGlobal.env.JWT_SECRET_KEY,
          { expiresIn: "7d", issuer: "autobe" },
        );
        await MyGlobal.prisma.ecommerce_customer_sessions.update({
          where: { id: decoded.session_id },
          data: { expired_at: refreshExpires },
        });
        const defaultAddressRecord =
          await MyGlobal.prisma.ecommerce_default_addresses.findFirst({
            where: { customer: { id: customer.id } },
          });
        const defaultAddress = defaultAddressRecord
          ? {
              id: defaultAddressRecord.id,
              createdAt: toISOStringSafe(defaultAddressRecord.created_at),
              updatedAt: toISOStringSafe(defaultAddressRecord.updated_at),
              deletedAt: defaultAddressRecord.deleted_at
                ? toISOStringSafe(defaultAddressRecord.deleted_at)
                : null,
            }
          : {
              id: "00000000-0000-0000-0000-000000000000" as string &
                tags.Format<"uuid">,
              createdAt: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              updatedAt: "1970-01-01T00:00:00.000Z" as string &
                tags.Format<"date-time">,
              deletedAt: null,
            };
        return {
          id: customer.id,
          email: customer.email,
          display_name: customer.display_name ?? null,
          phone: customer.phone ?? null,
          created_at: toISOStringSafe(customer.created_at),
          updated_at: toISOStringSafe(customer.updated_at),
          deleted_at: customer.deleted_at
            ? toISOStringSafe(customer.deleted_at)
            : null,
          defaultAddress,
          token: {
            access: accessToken,
            refresh: refreshToken,
            expired_at: toISOStringSafe(accessExpires),
            refreshable_until: toISOStringSafe(refreshExpires),
          },
          finally: {},
          finally: {},
        };
      } finally {
      }
    } finally {
    }
  } finally {
  }
}
