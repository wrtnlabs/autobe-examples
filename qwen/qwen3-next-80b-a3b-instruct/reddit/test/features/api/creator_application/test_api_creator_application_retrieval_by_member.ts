import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCreatorMonetizationApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCreatorMonetizationApplication";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_creator_application_retrieval_by_member(
  connection: api.IConnection,
) {
  // Authenticate member to establish context
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Create post to trigger application creation
  const communityCode: string = "test-community";
  await api.functional.communityPlatform.member.communities.posts.create(
    connection,
    {
      communityCode,
      body: "Post to trigger creator application creation." satisfies ICommunityPlatformPost.ICreate,
    },
  );

  // Retrieve application using valid UUID format
  const applicationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const application: ICommunityPlatformCreatorMonetizationApplication =
    await api.functional.communityPlatform.member.creator_applications.at(
      connection,
      {
        applicationId,
      },
    );
  typia.assert(application);
}
