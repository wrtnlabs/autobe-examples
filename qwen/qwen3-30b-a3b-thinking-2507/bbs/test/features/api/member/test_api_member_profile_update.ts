import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
        ip: "127.0.0.1",
      },
    });
  const updatedProfile: IDiscussionBoardMember =
    await api.functional.discussionBoard.member.members.update(
      memberConnection,
      {
        memberId: memberProfile.id,
        body: {
          name: "Updated Name",
          email: "updated@example.com",
          avatarUrl: "https://example.com/avatar.jpg",
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals("name updated", updatedProfile.name, "Updated Name");
  TestValidator.equals(
    "email updated",
    updatedProfile.email,
    "updated@example.com",
  );
  TestValidator.equals(
    "avatarUrl updated",
    updatedProfile.avatarUrl,
    "https://example.com/avatar.jpg",
  );
}
