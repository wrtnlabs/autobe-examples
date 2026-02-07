import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_comment } from "../prepare/prepare_random_community_comment";

export async function generate_random_community_member_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityComment.ICreate> | undefined;
  },
): Promise<ICommunityComment> {
  const prepared: ICommunityComment.ICreate = prepare_random_community_comment(
    props.body,
  );
  return await api.functional.community.member.comments.create(connection, {
    body: prepared,
  });
}
