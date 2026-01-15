import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSalesOrderNote";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sales_order_notes_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`,
  } satisfies ICommunityPlatformMember.IJoin;
  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Step 2: Prepare valid request — empty object satisfies IRequest (all properties optional)
  // IRequest contains: id (string & Format<"uuid">), note (string & MinLength<1> & MaxLength<10000>), created_at (string & Format<"date-time">)
  // We submit empty request to test base functionality
  const request: ICommunityPlatformSalesOrderNote.IRequest =
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      note: typia.random<string & tags.MinLength<1> & tags.MaxLength<10000>>(),
      created_at: new Date().toISOString(),
    } satisfies ICommunityPlatformSalesOrderNote.IRequest;
  // Step 3: Execute retrieval — using memberConnection, NOT base connection
  const retrievedNotes: IPageICommunityPlatformSalesOrderNote =
    await api.functional.communityPlatform.member.salesordernotes.index(
      memberConnection,
      {
        body: request,
      },
    );
  // Step 4: Apply typia.assert() for complete validation
  // typia.assert() performs total type validation and format checking per schema
  typia.assert(retrievedNotes);
  // Step 5: Verify pagination structure using TestValidator based on IPage.IPagination structure
  TestValidator.equals(
    "pagination current page",
    retrievedNotes.pagination.current,
    0,
  );
  TestValidator.equals("pagination limit", retrievedNotes.pagination.limit, 0);
  TestValidator.predicate(
    "pagination records count",
    retrievedNotes.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    retrievedNotes.pagination.pages >= 0,
  );
  // Step 6: Verify data structure — must be array of ICommunityPlatformSalesOrderNote
  TestValidator.predicate(
    "notes array exists",
    Array.isArray(retrievedNotes.data),
  );
  TestValidator.equals("no notes returned", retrievedNotes.data.length, 0);
}