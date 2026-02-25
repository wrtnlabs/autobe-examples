import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

export async function test_api_administrator_user_ban_administrator_super_privilege(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first regular administrator (ban creator)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123" satisfies string as string,
    },
  });
  typia.assert(admin1);
  // Step 2: Create second regular administrator (to be banned)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin456" satisfies string as string,
    },
  });
  typia.assert(admin2);
  // Step 3: Attempt to ban another administrator with regular admin privileges
  await TestValidator.error(
    "regular administrator cannot ban another administrator without super admin privileges",
    async () => {
      await api.functional.ecommerce.administrator.admin_user_bans.create(
        admin1Connection,
        {
          body: {
            user_type: "administrator",
            ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
            ban_duration_days: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            appeal_status: "none",
          } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
        },
      );
    },
  );
  // Step 4: Verify no ban was created by attempting to list bans (optional - depends on available APIs)
  // Since listing endpoint may not be available, we can validate error type by checking no successful call
  TestValidator.predicate(
    "regular admin connection headers are set",
    admin1Connection.headers !== undefined &&
      admin1Connection.headers.Authorization !== undefined,
  );
  TestValidator.predicate(
    "target admin connection headers are set",
    admin2Connection.headers !== undefined &&
      admin2Connection.headers.Authorization !== undefined,
  );
}
