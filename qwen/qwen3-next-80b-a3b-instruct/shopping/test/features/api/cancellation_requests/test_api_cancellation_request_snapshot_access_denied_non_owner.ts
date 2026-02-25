import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_snapshot_access_denied_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create two distinct customers: one to create the cancellation request, another to attempt unauthorized access
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(16);
  const creator = await authorize_customer_join(creatorConnection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(creator);
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerEmail = typia.random<string & tags.Format<"email">>();
  const viewerPassword = RandomGenerator.alphaNumeric(16);
  const viewer = await authorize_customer_join(viewerConnection, {
    body: {
      email: viewerEmail,
      password: viewerPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(viewer);
  // Create a cancellation request as the creator customer
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      creatorConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Attempt to access snapshots of the cancellation request as the viewer (non-owner)
  // This should return 403 Forbidden
  await TestValidator.httpError(
    "non-owner access to cancellation request snapshots denied",
    403,
    async () => {
      await api.functional.shoppingMall.customer.cancellations.snapshots.search(
        viewerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
    },
  );
}
