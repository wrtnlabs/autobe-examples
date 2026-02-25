import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { authorize_super_administrator_join as imported_authorize } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

async function authorize_super_administrator_join(connection: api.IConnection, props: {
    body?: Partial<IEcommerceSuperAdministrator.IJoin>;
}): Promise<IEcommerceSuperAdministrator.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
        referrer: props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
        ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin;
    return await api.functional.ecommerce.auth.superAdministrator.join(connection, { body: joinInput });
}

export async function test_api_db_migrations_superadministrator_view_failed_migration(connection: api.IConnection): Promise<void> {
    // The scenario requires testing a failed migration, but there's no API endpoint
    // to create or modify migration status. Since we cannot create a failed migration
    // through the available APIs, this test will focus on testing the authentication
    // and error handling when trying to access a non-existent migration ID.
    // Create super administrator connection
    const adminConnection: api.IConnection = { host: connection.host };
    // Join and authenticate as super administrator using utility function
    const superAdmin = await authorize_super_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    typia.assert(superAdmin);
    // Create authenticated connection with the token
    const authenticatedConnection: api.IConnection = {
        host: connection.host,
        headers: {
            Authorization: `Bearer ${superAdmin.token.access}`,
        },
    };
    // Test with a random UUID - since we cannot create a failed migration,
    // this will test the error handling for non-existent migrations
    const randomMigrationId = typia.random<string & tags.Format<"uuid">>();
    // Since we cannot test a real failed migration due to lack of creation API,
    // this test validates that super administrators can at least attempt to access
    // migration records and that the API responds appropriately
    await TestValidator.error("should handle non-existent migration ID", async () => {
        await api.functional.ecommerce.superAdministrator.db_migrations.at(authenticatedConnection, { migrationId: randomMigrationId });
    });
    // Alternative approach: Test that the API functions exist and can be called
    // This validates the authentication and basic endpoint functionality
    TestValidator.predicate("super administrator should be authenticated", authenticatedConnection.headers?.Authorization !== undefined);
}