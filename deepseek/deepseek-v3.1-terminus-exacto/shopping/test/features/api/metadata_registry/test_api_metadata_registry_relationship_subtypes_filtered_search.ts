import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_registry_relationship_subtypes_filtered_search(connection: api.IConnection): Promise<void> {
    // Create super administrator connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    
    // Generate test data for super administrator join
    const joinData: IEcommerceSuperAdministrator.IJoin = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>()
    };
    
    await authorize_super_administrator_join(superAdminConnection, {
        body: joinData
    });

    // Generate test UUIDs for registry and relationship
    const registryId = typia.random<string & tags.Format<"uuid">>();
    const relationshipId = typia.random<string & tags.Format<"uuid">>();

    // Test 1: Filter by userType = "customer"
    const customerResults = await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.search(superAdminConnection, {
        registryId,
        relationshipId,
        body: {
            userType: "customer" as const,
            page: 1,
            limit: 10
        }
    });
    typia.assert(customerResults);
    TestValidator.predicate("customer results should have pagination", customerResults.pagination.current === 1);

    // Test 2: Filter by accountStatus = "active"
    const activeResults = await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.search(superAdminConnection, {
        registryId,
        relationshipId,
        body: {
            accountStatus: "active" as const,
            page: 1,
            limit: 10
        }
    });
    typia.assert(activeResults);
    TestValidator.predicate("active results should have pagination", activeResults.pagination.current === 1);

    // Test 3: Filter by date range
    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = new Date().toISOString();
    const dateResults = await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.search(superAdminConnection, {
        registryId,
        relationshipId,
        body: {
            createdAt_from: dateFrom,
            createdAt_to: dateTo,
            page: 1,
            limit: 10
        }
    });
    typia.assert(dateResults);
    TestValidator.predicate("date range results should have pagination", dateResults.pagination.current === 1);

    // Test 4: Filter by search text
    const searchResults = await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.search(superAdminConnection, {
        registryId,
        relationshipId,
        body: {
            search: "test",
            page: 1,
            limit: 10
        }
    });
    typia.assert(searchResults);
    TestValidator.predicate("search results should have pagination", searchResults.pagination.current === 1);

    // Test 5: Combined filters
    const combinedResults = await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.search(superAdminConnection, {
        registryId,
        relationshipId,
        body: {
            userType: "administrator" as const,
            accountStatus: "active" as const,
            search: "admin",
            createdAt_from: dateFrom,
            createdAt_to: dateTo,
            page: 1,
            limit: 10
        }
    });
    typia.assert(combinedResults);
    TestValidator.predicate("combined results should have pagination", combinedResults.pagination.current === 1);
}