import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_view_own_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const snapshotPage: IPageIMallPlatformOrderItemSnapshot.ISummary = {
    pagination: {
      current: 1,
      limit: 10,
      records: 1,
      pages: 1,
    },
    data: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        snapshotAt: new Date().toISOString(),
        snapshotReason: "purchase history",
        orderItemStatus: "paid",
        productName: RandomGenerator.name(),
        productDescription: RandomGenerator.paragraph({ sentences: 2 }),
        productSku: RandomGenerator.alphabets(8),
        variantSkuCode: RandomGenerator.alphabets(10),
        sellerShopName: RandomGenerator.name(),
        sellerShopDescription: RandomGenerator.paragraph({ sentences: 2 }),
        sellerLogoImageUrl: "https://example.com/logo.png",
        unitPrice: 1000,
        quantity: 1,
        lineTotal: 1000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        orderItem: {
          id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
          status: "paid",
          order: {
            id: typia.random<string & tags.Format<"uuid">>(),
            customer: {
              id: typia.random<string & tags.Format<"uuid">>(),
              email: typia.random<string & tags.Format<"email">>(),
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
            },
            orderNumber: RandomGenerator.alphabets(12),
            status: "paid",
            totalAmount: 1000,
            recipientName: RandomGenerator.name(),
            recipientPhone: RandomGenerator.mobile(),
            streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
            city: RandomGenerator.name(),
            stateProvince: RandomGenerator.name(),
            postalCode: RandomGenerator.alphabets(6),
            country: RandomGenerator.name(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
          productVariant: {
            id: typia.random<string & tags.Format<"uuid">>(),
            product: {
              id: typia.random<string & tags.Format<"uuid">>(),
              sellerAccount: {
                id: typia.random<string & tags.Format<"uuid">>(),
                email: typia.random<string & tags.Format<"email">>(),
                approvalStatus: "approved",
                rejectionReason: null,
                suspendedAt: null,
                deletedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              category: null,
              name: RandomGenerator.name(),
              description: RandomGenerator.paragraph({ sentences: 2 }),
              basePrice: 1000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            },
            skuCode: RandomGenerator.alphabets(8),
            optionValues: RandomGenerator.name(),
            priceOverride: 1000,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
          seller: {
            id: typia.random<string & tags.Format<"uuid">>(),
            email: typia.random<string & tags.Format<"email">>(),
            status: "approved",
            rejectionReason: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
      },
    ],
  };
  typia.assert(snapshotPage);
}
