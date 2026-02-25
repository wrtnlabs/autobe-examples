import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_snapshots_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Filter soft-deleted snapshots
  const response = await api.functional.reddit.member.snapshots.index(
    memberConnection,
    {
      body: {
        deleted: true,
      } satisfies IRedditProfileSnapshot.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validation
  TestValidator.predicate(
    "should contain deleted snapshots",
    response.data.length > 0,
  );
  const recentSnapshot = response.data[0];
  TestValidator.predicate(
    "deleted_at should be present for soft-deleted records",
    recentSnapshot.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at should be in date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(recentSnapshot.deleted_at!),
  );
}
