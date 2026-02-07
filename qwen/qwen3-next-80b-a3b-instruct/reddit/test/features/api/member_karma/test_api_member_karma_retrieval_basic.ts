import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_karma_retrieval_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Retrieve karma profile for new member (should be 0 with empty history)
  const karmaProfile =
    await api.functional.community.member.karma.at(memberConnection);
  typia.assert(karmaProfile);
  // 3. Validate that new member has zero karma and empty history
  TestValidator.equals("karma score is zero", karmaProfile.data.length, 0);
  TestValidator.equals(
    "pagination records is zero",
    karmaProfile.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    karmaProfile.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    karmaProfile.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination pages is 0",
    karmaProfile.pagination.pages,
    0,
  );
}
