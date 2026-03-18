import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_admin_retrieve_details(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const comment = await api.functional.communityPlatform.admin.comments.at(
    adminConnection,
    {
      commentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(comment);
  TestValidator.predicate("comment id is present", comment.id.length > 0);
  TestValidator.predicate(
    "comment content is present",
    comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment author summary is present",
    comment.member !== null && comment.member !== undefined,
  );
  TestValidator.predicate(
    "comment post summary is present",
    comment.post !== null && comment.post !== undefined,
  );
  TestValidator.predicate(
    "comment created timestamp is present",
    comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment updated timestamp is present",
    comment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "comment deleted timestamp is nullable",
    comment.deleted_at === null || comment.deleted_at.length > 0,
  );
  TestValidator.predicate(
    "comment parent linkage is nullable summary",
    comment.parent === null || comment.parent !== undefined,
  );
}
