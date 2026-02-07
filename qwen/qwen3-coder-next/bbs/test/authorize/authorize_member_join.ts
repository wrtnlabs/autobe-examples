import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardMember.IJoin>;
  },
): Promise<IDiscussionBoardMember.IAuthorized> {
  const joinInput = {
    // IDiscussionBoardMember.IJoin has no required fields currently
  } satisfies IDiscussionBoardMember.IJoin;
  return await api.functional.discussionBoard.auth.member.join(connection, {
    body: props.body ?? joinInput,
  });
}
