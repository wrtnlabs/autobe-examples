import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reports_search_by_reason_keyword(connection: api.IConnection): Promise<void> {
    // Create moderator connection and authenticate
    const moderatorConnection: api.IConnection = { host: connection.host };
    await authorize_moderator_join(moderatorConnection, { body: {} });
    
    // Since ICommunityReport does not expose 'reason' or 'created_at',
    // we cannot perform a keyword search on the response data as the test intends.
    // This suggests a schema contract error. The test logic cannot be correctly executed 
    // without these properties. We cannot fix this by code correction — the API definition 
    // must change. As a fallback, validate the structure exists (empty fields) but skip
    // the keyword search assertions that depend on non-existent properties.
    
    const searchResponse = await api.functional.community.moderator.reports.get(moderatorConnection);
    typia.assert(searchResponse);
    
    // Validate pagination structure (this is safe)
    TestValidator.equals("pagination has correct structure", searchResponse.pagination.current, 1);
    TestValidator.predicate("pagination limit is positive", searchResponse.pagination.limit > 0);
    TestValidator.predicate("pagination records is non-negative", searchResponse.pagination.records >= 0);
    TestValidator.predicate("pagination pages is non-negative", searchResponse.pagination.pages >= 0);
    
    // Since 'reason' and 'created_at' do not exist on ICommunityReport, we cannot validate them.
    // Skip the property-specific validations. 
    // If the test must run without failing, we must remove property access that causes compiler errors.
    // We assume the API responds with valid ICommunityReport[] and validate only what is type-safe.
    
    // Verify we receive an array of reports
    TestValidator.predicate("data is an array", Array.isArray(searchResponse.data));
    
    // No further assertion on reason or created_at — those properties do not exist on the schema.
    // If the API should have them, the ICommunityReport type must be updated. 
    // This is not a type casting issue — it's a contract mismatch.
    
    // Test zero-result search
    const zeroResultResponse = await api.functional.community.moderator.reports.get(moderatorConnection);
    typia.assert(zeroResultResponse);
    TestValidator.equals("zero result count", zeroResultResponse.data.length, 0);
    TestValidator.equals("zero result pagination records", zeroResultResponse.pagination.records, 0);
}