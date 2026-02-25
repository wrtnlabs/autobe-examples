import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardProfile";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_profile_update_both(connection: api.IConnection) {
    // 1. Register new user using utility function
    const userConnection: api.IConnection = { host: connection.host };
    const joinResult = await authorize_user_join(userConnection, {
        body: {
            email: `${RandomGenerator.alphaNumeric(8)}`,
            password: '123456',
            href: 'https://example.com',
            referrer: 'test',
        },
    });

    // 3. Generate valid test data within field constraints
    const displayName = RandomGenerator.name(2);
    const bio = RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 20,
    });

    // 4. Update profile with both fields simultaneously
    const updatedProfile = await api.functional.economicPoliticalDiscussionBoard.user.profile.update(
        connection,
        {
            body: {
                display_name: displayName,
                bio: bio,
            },
        }
    );
    typia.assert(updatedProfile);

    // 5. Verify both updates were applied correctly
    TestValidator.equals('display_name matches input', updatedProfile.display_name, displayName);
    TestValidator.equals('bio matches input', updatedProfile.bio, bio);
}