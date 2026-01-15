import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
export async function test_api_payment_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a payment record using the API's random generator
  const generatedPayment: IShoppingMallPayment =
    api.functional.shoppingMall.payments.at.random();
  typia.assert(generatedPayment);
  // Retrieve the payment by its ID using the API
  const retrievedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.payments.at(connection, {
      paymentId: generatedPayment.id,
    });
  typia.assert(retrievedPayment);
  // Validate that the retrieved payment matches the generated payment
  TestValidator.equals(
    "retrieved payment matches generated payment",
    retrievedPayment,
    generatedPayment,
  );
}
