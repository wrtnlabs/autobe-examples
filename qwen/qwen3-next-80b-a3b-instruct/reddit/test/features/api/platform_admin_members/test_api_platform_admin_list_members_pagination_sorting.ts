import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_list_members_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(platformAdmin);
  // 2. Update platform admin connection with access token
  const updatedConnection: api.IConnection = { host: connection.host };
  updatedConnection.headers = {
    Authorization: `Bearer ${platformAdmin.token.access}`,
  };
  // 3. Fetch platform members with default pagination and sorting
  const response =
    await api.functional.redditCommunity.platformAdmin.members.index(
      updatedConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 50);
  TestValidator.predicate(
    "pagination records >= 50",
    response.pagination.records >= 50,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    response.pagination.pages >= 1,
  );
  // 5. Validate data structure and content
  TestValidator.equals("data array length", response.data.length, 50);
  // 6. Validate each member has only public fields (no private fields)
  for (const member of response.data) {
    TestValidator.equals("member has id", typeof member.id, "string");
    TestValidator.equals(
      "member has username",
      typeof member.username,
      "string",
    );
    TestValidator.equals(
      "member has display_name",
      typeof member.display_name,
      "string",
    );
    TestValidator.equals(
      "member has karma_score",
      typeof member.karma_score,
      "number",
    );
    TestValidator.equals(
      "member has created_at",
      typeof member.created_at,
      "string",
    );
    // Verify no private fields are present
    TestValidator.predicate("member has no email", !("email" in member));
    TestValidator.predicate(
      "member has no registrationIP",
      !("registrationIP" in member),
    );
  }
  // 7. Validate sorting by karma_score descending
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "members sorted by karma_score descending",
      response.data[i].karma_score >= response.data[i + 1].karma_score,
    );
  }
}
