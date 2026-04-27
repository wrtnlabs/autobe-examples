import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_list_filtered_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to obtain their UUID
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Call the password resets listing endpoint filtered by memberId
  const page =
    await api.functional.communityPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          memberId: memberId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate empty page - no password resets exist for this member
  TestValidator.equals("empty password reset list", page.data.length, 0);
  TestValidator.equals("zero records", page.pagination.records, 0);
  TestValidator.equals("zero pages", page.pagination.pages, 0);
}
