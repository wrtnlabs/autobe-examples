import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_ban_list_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {},
  );
  // Step 2: Retrieve bans with limit=5 using the owner's authorized connection
  const firstPage: IPageICommunityPlatformBan =
    await api.functional.communityPlatform.owner.moderation.bans.index(
      ownerConnection,
      {
        body: {
          limit: 5,
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  // Step 3: Validate the pagination response structure
  typia.assert(firstPage);
  // Step 4: Validate that the limit restriction worked (<= 5 items)
  TestValidator.predicate("limit of 5 applied", firstPage.data.length <= 5);
  // Step 5: Validate that there's pagination information
  TestValidator.predicate(
    "at least one page",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is correctly set",
    firstPage.pagination.limit === 5,
  );
  TestValidator.predicate(
    "records count is reasonable",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is reasonable",
    firstPage.pagination.pages >= 0,
  );
}
