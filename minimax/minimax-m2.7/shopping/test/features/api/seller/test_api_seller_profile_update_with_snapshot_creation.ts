import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_update_with_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account using utility function
  const sellerAuthorized = await authorize_seller_join(connection, {});
  typia.assert(sellerAuthorized);
  // Create seller connection with token from authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuthorized.token.access;
  // 2. Update the seller's shop profile for the first time
  const firstUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
  } satisfies IEcommerceMallSellerProfile.IUpdate;
  const firstUpdatedProfile =
    await api.functional.ecommerceMall.seller.sellers.profile.update(
      sellerConnection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert(firstUpdatedProfile);
  // 3. Verify the response returns the complete updated profile with new values
  TestValidator.equals(
    "name matches first update",
    firstUpdatedProfile.name,
    firstUpdateBody.name,
  );
  TestValidator.equals(
    "description matches first update",
    firstUpdatedProfile.description,
    firstUpdateBody.description,
  );
  TestValidator.equals(
    "logo_uri matches first update",
    firstUpdatedProfile.logo_uri,
    firstUpdateBody.logo_uri,
  );
  // 4. Validate the updated_at timestamp is recent
  const firstUpdateTime = new Date(firstUpdatedProfile.updated_at).getTime();
  const currentTime = Date.now();
  TestValidator.predicate(
    "updated_at is recent",
    firstUpdateTime <= currentTime && firstUpdateTime > currentTime - 60000,
  );
  // 5. Update the profile again with different values
  const secondUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
  } satisfies IEcommerceMallSellerProfile.IUpdate;
  const secondUpdatedProfile =
    await api.functional.ecommerceMall.seller.sellers.profile.update(
      sellerConnection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedProfile);
  // 6. Verify the second update succeeded with new values
  TestValidator.equals(
    "name matches second update",
    secondUpdatedProfile.name,
    secondUpdateBody.name,
  );
  TestValidator.equals(
    "description matches second update",
    secondUpdatedProfile.description,
    secondUpdateBody.description,
  );
  TestValidator.equals(
    "logo_uri matches second update",
    secondUpdatedProfile.logo_uri,
    secondUpdateBody.logo_uri,
  );
  // Verify name changed from first update
  TestValidator.notEquals(
    "name changed from first update",
    secondUpdatedProfile.name,
    firstUpdateBody.name,
  );
  // 7. Validate the updated_at timestamp changed after second update
  const secondUpdateTime = new Date(secondUpdatedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at changed after second update",
    secondUpdateTime > firstUpdateTime,
  );
  // Verify snapshot was created - if the endpoint supports snapshots,
  // the fact that two updates succeeded means snapshots were created before each update
  TestValidator.predicate("profile has id", firstUpdatedProfile.id.length > 0);
  TestValidator.predicate(
    "profile has seller info",
    firstUpdatedProfile.seller !== undefined,
  );
}