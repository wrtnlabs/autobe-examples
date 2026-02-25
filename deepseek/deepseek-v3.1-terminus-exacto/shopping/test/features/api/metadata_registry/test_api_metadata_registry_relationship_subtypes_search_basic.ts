import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_registry_relationship_subtypes_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(auth);
  // Search for relationship subtypes without filters
  const searchResult =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.search(
      superAdminConnection,
      {
        registryId: typia.random<string & tags.Format<"uuid">>(),
        relationshipId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination field exists",
    searchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data field exists",
    Array.isArray(searchResult.data),
    true,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", searchResult.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure if items exist
  if (searchResult.data.length > 0) {
    const item = searchResult.data[0];
    TestValidator.equals("item has id field", typeof item.id, "string");
    TestValidator.equals(
      "item has action_type field",
      typeof item.action_type,
      "string",
    );
    TestValidator.equals(
      "item has general_description field",
      typeof item.general_description,
      "string",
    );
    TestValidator.equals(
      "item has created_at field",
      typeof item.created_at,
      "string",
    );
    // Validate administrator field (can be null)
    if (item.administrator !== null) {
      TestValidator.equals(
        "administrator has id field",
        typeof item.administrator.id,
        "string",
      );
      TestValidator.equals(
        "administrator has email field",
        typeof item.administrator.email,
        "string",
      );
      TestValidator.equals(
        "administrator has created_at field",
        typeof item.administrator.created_at,
        "string",
      );
    }
    // Validate superAdministrator field (can be null)
    if (item.superAdministrator !== null) {
      TestValidator.equals(
        "superAdministrator has id field",
        typeof item.superAdministrator.id,
        "string",
      );
      TestValidator.equals(
        "superAdministrator has email field",
        typeof item.superAdministrator.email,
        "string",
      );
      TestValidator.equals(
        "superAdministrator has created_at field",
        typeof item.superAdministrator.created_at,
        "string",
      );
    }
  }
}
