import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerEmailVerification";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerEmailVerifications(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerEmailVerification.IRequest;
}): Promise<IPageIShoppingMallCustomerEmailVerification.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const customerVerifications =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const customerCount =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.count({
      where: { deleted_at: null },
    });
  const sellerVerifications =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const sellerCount =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.count({
      where: { deleted_at: null },
    });
  function isCustomerRecord(
    record: any,
  ): record is (typeof customerVerifications)[number] {
    return "shopping_mall_customer_id" in record;
  }
  const combinedData = [...customerVerifications, ...sellerVerifications].map(
    (record) => {
      if (isCustomerRecord(record)) {
        return {
          id: record.id as string & tags.Format<"uuid">,
          token: record.token,
          expires_at: toISOStringSafe(record.expires_at) as string &
            tags.Format<"date-time">,
          verified_at: record.verified_at
            ? (toISOStringSafe(record.verified_at) as string &
                tags.Format<"date-time">)
            : null,
          customer_id: record.shopping_mall_customer_id as string &
            tags.Format<"uuid">,
          seller_id: null,
          created_at: toISOStringSafe(record.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(record.updated_at) as string &
            tags.Format<"date-time">,
          deleted_at: record.deleted_at
            ? (toISOStringSafe(record.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        };
      } else {
        return {
          id: record.id as string & tags.Format<"uuid">,
          token: record.token,
          expires_at: toISOStringSafe(record.expired_at) as string &
            tags.Format<"date-time">,
          verified_at: null,
          customer_id: null,
          seller_id: record.seller_id as string & tags.Format<"uuid">,
          created_at: toISOStringSafe(record.created_at) as string &
            tags.Format<"date-time">,
          updated_at: toISOStringSafe(record.updated_at) as string &
            tags.Format<"date-time">,
          deleted_at: record.deleted_at
            ? (toISOStringSafe(record.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        };
      }
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: customerCount + sellerCount,
      pages: Math.ceil((customerCount + sellerCount) / limit),
    },
    data: combinedData,
  };
}
