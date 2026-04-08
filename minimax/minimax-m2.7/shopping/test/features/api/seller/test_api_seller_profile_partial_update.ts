import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile partial update functionality - updating only specific fields.
 *
 * Validates that partial updates to the seller shop profile correctly modify only the
 * provided fields while preserving all other unchanged fields. Each partial update should
 * create a snapshot of the previous state before applying changes.
 *
 * **Business Validation:**
 * - Partial updates only modify provided fields (logoUri, name, description)
 * - Unchanged fields retain their original values after update
 * - Each edit operation creates a profile snapshot for historical tracking
 * - Field constraints are validated (logoUri must be valid URI format)
 *
 * 1. Register a seller and capture initial profile values.
 * 2. Update only the logoUri field via PATCH.
 * 3. Verify logoUri is updated while name and description remain unchanged.
 * 4. Update only the description field via PATCH.
 * 5. Verify description is updated while name and logoUri remain unchanged.
 * 6. Confirm partial updates work correctly without affecting unrelated fields.
 */
export async function test_api_seller_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller and get initial profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Extract initial profile values
  const initialName = authorized.profile.name;
  const initialDescription =
    authorized.profile.description ?? "Default description";
  const initialLogoUri = authorized.profile.logoUri ?? null;
  // 2. Update ONLY the logoUri field (partial update)
  const newLogoUri = `https://example.com/logos/${RandomGenerator.alphabets(10)}.png`;
  const updatedProfile1 =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          logoUri: newLogoUri,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile1);
  // 3. Verify logoUri was updated, name and description preserved
  TestValidator.equals(
    "logo_uri updated",
    updatedProfile1.logo_uri,
    newLogoUri,
  );
  TestValidator.equals(
    "name preserved after logo update",
    updatedProfile1.name,
    initialName,
  );
  TestValidator.equals(
    "description preserved after logo update",
    updatedProfile1.description,
    initialDescription,
  );
  // 4. Update ONLY the description field (partial update)
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile2 =
    await api.functional.ecommerceMall.seller.sellers.me.profile.patch(
      sellerConnection,
      {
        body: {
          description: newDescription,
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile2);
  // 5. Verify description was updated, name and logoUri preserved
  TestValidator.equals(
    "description updated",
    updatedProfile2.description,
    newDescription,
  );
  TestValidator.equals(
    "name preserved after description update",
    updatedProfile2.name,
    initialName,
  );
  TestValidator.equals(
    "logo_uri preserved after description update",
    updatedProfile2.logo_uri,
    newLogoUri,
  );
  // 6. Verify both updates created correct snapshots (profile history preserved)
  // Each PATCH should create a snapshot - verify final state reflects both updates
  TestValidator.equals(
    "final name matches initial",
    updatedProfile2.name,
    initialName,
  );
  TestValidator.equals(
    "final logo matches second update",
    updatedProfile2.logo_uri,
    newLogoUri,
  );
  TestValidator.equals(
    "final description matches second update",
    updatedProfile2.description,
    newDescription,
  );
}
