import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceModificationInventoryRestorationTransformer } from "../transformers/EcommerceModificationInventoryRestorationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorModificationsOverview(props: {
  administrator: AdministratorPayload;
}): Promise<IEcommerceModificationInventoryRestoration> {
  // Find a recent inventory restoration record
  const restoration =
    await MyGlobal.prisma.ecommerce_modification_inventory_restorations.findFirst(
      {
        where: { deleted_at: null },
        ...EcommerceModificationInventoryRestorationTransformer.select(),
        orderBy: { created_at: "desc" } as const,
      },
    );
  if (!restoration) {
    // Return a default/null restoration object structure
    return {
      id: v4() as string & tags.Format<"uuid">,
      quantity_restored: 0,
      restoration_reason: "No restoration records found",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
      deleted_at: null,
      cancellationRequest: null,
      refundRequest: null,
      inventoryRecord: {
        id: v4() as string & tags.Format<"uuid">,
        quantity: 0,
        reason: "No inventory record",
        created_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        deleted_at: null,
        variant: {
          id: v4() as string & tags.Format<"uuid">,
          sku: "N/A",
          option_values: "N/A",
          price_override: null,
          quantity: 0,
          product: {
            id: v4() as string & tags.Format<"uuid">,
            name: "No product",
            base_price: 0,
            seller: {
              id: v4() as string & tags.Format<"uuid">,
              email: "noemail@example.com" as string & tags.Format<"email">,
              shop_name: "No shop",
              shop_description: null,
              logo_image_url: null,
              account_status: "inactive",
              created_at: new Date().toISOString() as string &
                tags.Format<"date-time">,
            } satisfies IEcommerceSeller.ISummary,
            category: {
              id: v4() as string & tags.Format<"uuid">,
              name: "Uncategorized",
              parent: null,
              products_count: 0,
              created_at: new Date().toISOString() as string &
                tags.Format<"date-time">,
            } satisfies IEcommerceCategory.ISummary,
          } satisfies IEcommerceProduct.ISummary,
        } satisfies IEcommerceProductVariant.ISummary,
        seller: {
          id: v4() as string & tags.Format<"uuid">,
          email: "noseller@example.com" as string & tags.Format<"email">,
          shop_name: "No seller",
          shop_description: null,
          logo_image_url: null,
          account_status: "inactive",
          created_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceSeller.ISummary,
        order: null,
      } satisfies IEcommerceInventoryRecord,
    };
  }
  return await EcommerceModificationInventoryRestorationTransformer.transform(
    restoration,
  );
}
