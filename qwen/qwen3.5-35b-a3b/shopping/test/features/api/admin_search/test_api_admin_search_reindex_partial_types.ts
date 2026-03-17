import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSearchIndicesReindexJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchIndicesReindexJob";
import type { IEcommerceMallSearchIndicesReindexRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchIndicesReindexRequest";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_search_reindex_partial_types(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    const adminResult = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.assert<string & tags.Format<"ipv4">>(typia.random<string & tags.Format<"ipv4">>()),
        } satisfies IEcommerceMallAdmin.IJoin,
    });
    typia.assert(adminResult);
    // 2. Trigger partial reindex for products and categories only
    const reindexJob = await api.functional.ecommerceMall.admin.search.reindex(adminConnection, {
        body: {
            entityTypes: ["product", "category"] as const,
        } satisfies IEcommerceMallSearchIndicesReindexRequest,
    });
    typia.assert(reindexJob);
    // 3. Validate job response
    TestValidator.equals("entity types match request", reindexJob.entityTypes, ["product", "category"]);
    TestValidator.equals("initial status is queued", reindexJob.status, "queued");
    TestValidator.predicate("has valid entity count", reindexJob.totalEntityCount > 0);
    TestValidator.predicate("created timestamp is valid", reindexJob.createdAt !== null && reindexJob.createdAt !== undefined);
    TestValidator.predicate("updated timestamp is valid", reindexJob.updatedAt !== null && reindexJob.updatedAt !== undefined);
    TestValidator.equals("completed timestamp is null for queued job", reindexJob.completedAt, null);
    TestValidator.predicate("estimated completion time is not null", reindexJob.estimatedCompletionTime !== null &&
        reindexJob.estimatedCompletionTime !== undefined);
}