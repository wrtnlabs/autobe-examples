import api from "@ORGANIZATION/PROJECT-api";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_shopping_mall_cancellation_request } from "../prepare/prepare_random_shopping_mall_cancellation_request";

export async function generate_random_shopping_mall_customer_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCancellationRequest.ICreate>;
  }
): Promise<IShoppingMallCancellationRequest> {
  const prepared: IShoppingMallCancellationRequest.ICreate = prepare_random_shopping_mall_cancellation_request(props.body);
  const result: IShoppingMallCancellationRequest = await api.functional.shoppingMall.customer.cancellation_requests.create(
    connection,
    { body: prepared }
  );
  return result;
}