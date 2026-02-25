import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { generate_random_ecommerce_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_create";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_metadata_registry_creation_with_description(connection: api.IConnection): Promise<void> {
    // Step 1: Administrator setup using utility function
    const adminConnection: api.IConnection = { host: connection.host };
    const administrator = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>() satisfies string & tags.Format<"password">,
        },
    });
    typia.assert(administrator);

    // Step 2: Create metadata registry entry with description
    const descriptionContent = "Test metadata registry with description";
    const metadataRegistry = await api.functional.ecommerce.administrator.metadata_registries.create(adminConnection, {
        body: {
            schema_name: "test_schema",
            schema_version: "1.0.0",
            description: descriptionContent,
            is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
    });
    typia.assert(metadataRegistry);

    // Step 3: Validate response contains provided description
    TestValidator.equals("description matches input", metadataRegistry.description, descriptionContent);
    TestValidator.predicate("schema_name populated", metadataRegistry.schema_name === "test_schema");
    TestValidator.predicate("schema_version populated", metadataRegistry.schema_version === "1.0.0");
    TestValidator.predicate("is_active is true", metadataRegistry.is_active === true);
    TestValidator.predicate("has UUID ID", typeof metadataRegistry.id === "string" && metadataRegistry.id.length > 0);
    TestValidator.predicate("has created_at timestamp", typeof metadataRegistry.created_at === "string" && metadataRegistry.created_at.length > 0);
    TestValidator.predicate("has updated_at timestamp", typeof metadataRegistry.updated_at === "string" && metadataRegistry.updated_at.length > 0);

    // Step 4: Test uniqueness constraint by attempting to create duplicate
    await TestValidator.error("duplicate schema name and version", async () => {
        await api.functional.ecommerce.administrator.metadata_registries.create(adminConnection, {
            body: {
                schema_name: "test_schema",
                schema_version: "1.0.0",
                description: "Attempted duplicate entry",
                is_active: true,
            } satisfies IEcommerceMetadataRegistry.ICreate,
        });
    });

    // Step 5: Test optional field with null description
    const metadataRegistryNullDesc = await api.functional.ecommerce.administrator.metadata_registries.create(adminConnection, {
        body: {
            schema_name: "test_schema_2",
            schema_version: "1.0.0",
            description: null,
            is_active: false,
        } satisfies IEcommerceMetadataRegistry.ICreate,
    });
    typia.assert(metadataRegistryNullDesc);
    TestValidator.equals("null description handled", metadataRegistryNullDesc.description, null);
}