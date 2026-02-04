import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with fresh join registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      // Minimal join registration - all required fields handled by server
    } satisfies IEconPoliticBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate realistic display name (max 30 characters)
  const newDisplayName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 30,
  }).slice(0, 30);
  // 3. Generate realistic bio (max 500 characters)
  const newBio = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 5,
    wordMax: 10,
  }).slice(0, 500);
  // 4. Update profile with both fields
  const updatedProfile =
    await api.functional.econPoliticBoard.member.profiles.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          bio: newBio,
        } satisfies IEconPoliticBoardProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify display name changed correctly
  TestValidator.equals(
    "display name matches request",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 6. Verify bio changed correctly
  TestValidator.equals("bio matches request", updatedProfile.bio, newBio);
  // 7. Verify profile fields are complete (not just the updated fields)
  TestValidator.equals(
    "article count is present",
    typeof updatedProfile.article_count,
    "number",
  );
  TestValidator.equals(
    "comment count is present",
    typeof updatedProfile.comment_count,
    "number",
  );
}
