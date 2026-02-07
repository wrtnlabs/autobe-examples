import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_list_partial_email_search(
  connection: api.IConnection,
): Promise<void> {
  // Request to search for users with 'test' in email
  const request: ICommunityPlatformMember.IRequest = {
    search: "test",
  };
  // Call the API to get filtered users
  const result: IPageICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.members.index(connection, {
      body: request,
    });
  typia.assert(result);
  // Since the DTO ICommunityPlatformMember.ISummary has no properties, we can't validate email content
  // Instead, validate that the API returned at least one matching user (as a basic validation)
  TestValidator.predicate(
    "Should return at least one matching user",
    () => result.data.length > 0,
  );
}
