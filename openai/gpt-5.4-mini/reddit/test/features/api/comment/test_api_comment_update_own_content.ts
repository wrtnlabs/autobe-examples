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

export async function test_api_comment_update_own_content(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updated = await api.functional.communityPlatform.admin.comments.update(
    adminConnection,
    {
      commentId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        content: updatedContent,
      } satisfies ICommunityPlatformComment.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "comment content should match request",
    updated.content,
    updatedContent,
  );
  TestValidator.predicate(
    "comment id should be a uuid",
    () => updated.id.length > 0,
  );
  TestValidator.predicate(
    "comment has post reference",
    () => updated.post !== null,
  );
  TestValidator.predicate(
    "comment has member reference",
    () => updated.member !== null,
  );
  TestValidator.predicate(
    "comment created_at should exist",
    () => updated.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment updated_at should exist",
    () => updated.updated_at.length > 0,
  );
  TestValidator.predicate(
    "comment deleted_at is nullable",
    () => updated.deleted_at === null || updated.deleted_at.length > 0,
  );
}
