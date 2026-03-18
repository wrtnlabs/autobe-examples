import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { generate_random_shopping_mall_member_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipment_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_member_review_update_forbidden_not_author(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>() satisfies
    string & tags.Format<"email">;
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.IJoin,
  });

  const memberAAuthorized = await authorize_member_login(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(memberAAuthorized);

  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>() satisfies
    string & tags.Format<"email">;
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.IJoin,
  });

  const memberBAuthorized = await authorize_member_login(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(memberBAuthorized);

  const payment = await generate_random_shopping_mall_member_payments_create(
    memberAConnection,
    {},
  );
  typia.assert(payment);

  const order = await generate_random_shopping_mall_member_orders_create(
    memberAConnection,
    {},
  );
  typia.assert(order);

  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberAConnection,
    {},
  );
  typia.assert(shipment);

  await generate_random_shopping_mall_member_shipment_confirmations_create(
    memberAConnection,
    {
      body: {
        shoppingMallShipmentId: shipment.id,
        confirmationType: "delivered",
        confirmedAt: new Date().toISOString(),
        trackingUrl: null,
        trackingNumber: null,
        carrierName: null,
        note: null,
      } satisfies IShoppingMallShipmentConfirmation.ICreate,
    },
  );

  const reviewBeforeCreate =
    await generate_random_shopping_mall_member_reviews_create(
      memberAConnection,
      {},
    );
  typia.assert(reviewBeforeCreate);
  const reviewIdA = reviewBeforeCreate.id;

  const updatedRating = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5>;
  const updatedBody = RandomGenerator.paragraph({ sentences: 2 });

  const updated = await api.functional.shoppingMall.member.reviews.update(
    memberBConnection,
    {
      reviewId: reviewIdA,
      body: {
        rating: updatedRating,
        body: updatedBody,
        is_public: false,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updated);

  TestValidator.equals(
    "rating unchanged",
    updated.rating,
    reviewBeforeCreate.rating,
  );
  TestValidator.equals(
    "body unchanged",
    updated.body,
    reviewBeforeCreate.body,
  );
  TestValidator.equals(
    "is_public unchanged",
    updated.is_public,
    reviewBeforeCreate.is_public,
  );
}
