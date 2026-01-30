import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMemberSession";
import { prepare_random_community_bbs_member } from "../prepare/prepare_random_community_bbs_member";
export async function generate_random_community_bbs_member_member_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsMember.ICreate> | undefined;
  },
): Promise<ICommunityBbsMemberSession> {
  const prepared: ICommunityBbsMember.ICreate =
    prepare_random_community_bbs_member(props.body);
  const result: ICommunityBbsMemberSession =
    await api.functional.communityBbs.member.member_sessions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
