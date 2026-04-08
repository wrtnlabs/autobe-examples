import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_delivery_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create shipment with order items (seller creates the shipment)
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // 3. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Customer confirms delivery
  const confirmedDelivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedDelivery);
  // 5. Seller retrieves delivery confirmation
  const retrievedDelivery =
    await api.functional.ecommerceMall.seller.shipments.delivery.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(retrievedDelivery);
  // 6. Validate delivery details match
  TestValidator.equals(
    "delivery id matches confirmed delivery",
    retrievedDelivery.id,
    confirmedDelivery.id,
  );
  TestValidator.equals(
    "shipment id matches",
    retrievedDelivery.shipment.id,
    shipment.id,
  );
  // Note: IEcommerceMallCustomer.ISummary is empty {} so we cannot validate customer.id
  TestValidator.predicate(
    "customer exists (manual confirmation)",
    retrievedDelivery.customer !== null,
  );
  TestValidator.predicate(
    "delivery timestamp exists",
    retrievedDelivery.deliveredAt != null,
  );
  TestValidator.equals(
    "isAutoDelivered is false (manual confirmation)",
    retrievedDelivery.isAutoDelivered,
    false,
  );
}
