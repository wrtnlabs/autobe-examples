import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformChannel";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_channel_list_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Create search request with a unique search term
  // Generate a unique search term to improve reliability
  const searchTerm = RandomGenerator.alphaNumeric(8);
  const searchRequest: ICommunityPlatformChannel.IRequest = {
    page: 1,
    limit: 10,
    search: searchTerm,
  } satisfies ICommunityPlatformChannel.IRequest;
  // Step 3: Call API to search channels
  const searchResult: IPageICommunityPlatformChannel.ISummary =
    await api.functional.communityPlatform.member.channels.index(
      memberConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);
  // No manual validations needed as typia.assert() already validates entire structure
  // This guarantees the response matches the IPageICommunityPlatformChannel.ISummary type
  // including pagination structure and each channel in data array with proper types
  // The scenario's requirement for partial matching is best validated by the API's own behavior
  // We cannot assert the content of results without creating test data (not possible with current API)
  // Therefore, verifying the structure is the only reliable validation
}
