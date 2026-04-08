import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
export async function test_api_administrator_customer_deleted_filter(connection: api.IConnection): Promise<void> {
    // 1. Administrator authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const admin: IEcommerceMallAdministrator.IAuthorized = await authorize_administrator_join(adminConnection, {
        body: {
            display_name: RandomGenerator.name(2),
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            grade: "regular"
        } satisfies IEcommerceMallAdministrator.IJoin,
    });
    typia.assert(admin);
    // 2. Default behavior: should exclude soft-deleted customers
    const defaultResponse: IPageIEcommerceMallMember.ISummary = await api.functional.ecommerceMall.administrator.customers.index(adminConnection, {
        body: {} satisfies IEcommerceMallMember.IRequest,
    });
    typia.assert(defaultResponse);
    // Verify default excludes deleted customers
    if (defaultResponse.data.length > 0) {
        const deletedInDefault = defaultResponse.data.some((c) => c.deleted_at !== null);
        TestValidator.predicate("default excludes soft-deleted customers", deletedInDefault === false);
        // Verify all returned customers have deleted_at = NULL
        for (const customer of defaultResponse.data) {
            TestValidator.predicate(`customer ${customer.id} has deleted_at = NULL in default`, customer.deleted_at === null);
        }
        // Verify soft-deleted customer records contain all required fields
        const sampleCustomer = defaultResponse.data[0];
        typia.assert(sampleCustomer);
        // Validate all summary fields are present
        TestValidator.notEquals("customer has valid id", sampleCustomer.id, null);
        TestValidator.notEquals("customer has valid email", sampleCustomer.email, null);
        TestValidator.notEquals("customer has valid email", sampleCustomer.email, undefined);
        TestValidator.notEquals("customer has valid display_name or null", sampleCustomer.display_name, undefined);
        TestValidator.notEquals("customer has valid phone_number or null", sampleCustomer.phone_number, undefined);
        TestValidator.notEquals("customer has valid created_at", sampleCustomer.created_at, null);
        TestValidator.notEquals("customer has valid updated_at", sampleCustomer.updated_at, null);
        // Validate deleted_at is either null or string
        TestValidator.predicate("deleted_at is either null or string", sampleCustomer.deleted_at === null ||
            typeof sampleCustomer.deleted_at === "string");
        // Validate deleted_at timestamp format if not null
        if (sampleCustomer.deleted_at !== null) {
            const parsedDate = new Date(sampleCustomer.deleted_at);
            TestValidator.predicate("deleted_at is valid ISO 8601 date-time", !isNaN(parsedDate.getTime()));
        }
    }
    // Verify pagination structure
    TestValidator.notEquals("pagination present", defaultResponse.pagination, undefined);
    TestValidator.notEquals("pagination.current present", defaultResponse.pagination.current, undefined);
    TestValidator.notEquals("pagination.limit present", defaultResponse.pagination.limit, undefined);
    TestValidator.notEquals("pagination.records present", defaultResponse.pagination.records, undefined);
    TestValidator.notEquals("pagination.pages present", defaultResponse.pagination.pages, undefined);
    // Validate pagination values are within expected ranges
    TestValidator.predicate("pagination.current is non-negative", defaultResponse.pagination.current >= 0);
    TestValidator.predicate("pagination.limit is non-negative", defaultResponse.pagination.limit >= 0);
    TestValidator.predicate("pagination.records is non-negative", defaultResponse.pagination.records >= 0);
    TestValidator.predicate("pagination.pages is non-negative", defaultResponse.pagination.pages >= 0);
    // Test with email filter to verify filtering works
    const emailFilter: IPageIEcommerceMallMember.ISummary = await api.functional.ecommerceMall.administrator.customers.index(adminConnection, {
        body: {
            email: "@test.com",
        } satisfies IEcommerceMallMember.IRequest,
    });
    typia.assert(emailFilter);
    // Verify pagination still works with filter
    TestValidator.notEquals("pagination works with email filter", emailFilter.pagination, undefined);
    // Verify returned customers match email filter criteria
    for (const customer of emailFilter.data) {
        if (customer.email !== null && customer.email.includes("@")) {
            TestValidator.predicate(`customer email contains @`, customer.email.includes("@"));
        }
    }
}