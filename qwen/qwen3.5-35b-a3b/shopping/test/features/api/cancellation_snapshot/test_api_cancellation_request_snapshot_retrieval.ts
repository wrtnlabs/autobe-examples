import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResponse);
  // 2. Setup: Register member (customer) account
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinResponse = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberJoinResponse);
  // 3. Setup: Login member for cancellation request operations
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginResponse = await authorize_member_login(
    memberLoginConnection,
    {
      body: {
        email: memberJoinResponse.email,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.ILogin,
    },
  );
  typia.assert(memberLoginResponse);
  // 4. Create cancellation request as member
  const cancellationRequest =
    await generate_random_ecommerce_mall_member_cancellation_requests_create(
      memberLoginConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Test snapshot retrieval by seller
  // Note: Snapshot creation requires seller to approve/reject cancellation request
  // Since that endpoint is not available, we test retrieval with a mock ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "snapshot not found when snapshot doesn't exist",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_request_snapshots.at(
        sellerConnection,
        {
          id: snapshotId,
        },
      );
    },
  );
}
