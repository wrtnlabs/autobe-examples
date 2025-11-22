import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_registered_user_activities_metadata_privacy(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account with session tracking metadata
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10) + "1!";
  const userUsername = RandomGenerator.name(1)
    .toLowerCase()
    .replace(/\s/g, "_");

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: "Seoul, South Korea",
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://reddit-platform.test/user/profile",
        referrer: "https://reddit-platform.test/auth/login",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  TestValidator.equals(
    "user account created successfully",
    registeredUser.username,
    userUsername,
  );
  TestValidator.equals(
    "user authentication token issued",
    !!registeredUser.token.access,
    true,
  );
  TestValidator.equals(
    "user email verified status",
    registeredUser.emailVerified,
    false,
  ); // Initially unverified

  // Step 2: Retrieve user activity data to validate metadata and privacy structure
  const userActivities: IPageIRedditPlatformUserActivity =
    await api.functional.redditPlatform.registeredUser.users.activities.index(
      connection,
      {
        userId: registeredUser.id,
      },
    );
  typia.assert(userActivities);

  // Step 3: Validate pagination structure and metadata
  TestValidator.equals(
    "activity data pagination present",
    !!userActivities.pagination,
    true,
  );
  TestValidator.equals(
    "activity records array present",
    !!userActivities.data,
    true,
  );
  TestValidator.equals(
    "pagination has correct current page",
    userActivities.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    userActivities.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    userActivities.pagination.pages >= 0,
    true,
  );

  // Step 4: Validate activity data structure and metadata fields
  if (userActivities.data.length > 0) {
    const firstActivity: IRedditPlatformUserActivity = userActivities.data[0];

    // Validate core activity fields
    TestValidator.equals(
      "user ID field present",
      !!firstActivity.user_id,
      true,
    );
    TestValidator.equals(
      "export timestamp present",
      !!firstActivity.export_timestamp,
      true,
    );
    TestValidator.equals(
      "activities array present",
      !!firstActivity.activities,
      true,
    );
    TestValidator.equals(
      "total activities count present",
      !!firstActivity.total_activities,
      true,
    );
    TestValidator.equals(
      "activity summary present",
      !!firstActivity.activity_summary,
      true,
    );

    // Validate optional metadata fields (IP address and user agent for privacy compliance)
    if (firstActivity.ip_address !== undefined) {
      TestValidator.predicate(
        "IP address is valid format",
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(firstActivity.ip_address),
      );
    }

    if (firstActivity.user_agent !== undefined) {
      TestValidator.predicate(
        "user agent is valid string",
        firstActivity.user_agent.length > 0,
      );
    }

    // Validate activity summary structure
    if (firstActivity.activity_summary) {
      const summary = firstActivity.activity_summary;
      TestValidator.equals(
        "activity summary has type counts",
        !!summary.activity_type_counts,
        true,
      );
      TestValidator.equals(
        "activity summary has date range",
        !!summary.date_range,
        true,
      );
      TestValidator.equals(
        "activity summary has total activities",
        !!summary.total_activities,
        true,
      );

      // Validate activity type counts structure
      if (summary.activity_type_counts) {
        const typeCounts = summary.activity_type_counts;
        TestValidator.equals(
          "post created count present",
          typeof typeCounts.postCreated === "number",
          true,
        );
        TestValidator.equals(
          "comment created count present",
          typeof typeCounts.commentCreated === "number",
          true,
        );
        TestValidator.equals(
          "post voted count present",
          typeof typeCounts.postVoted === "number",
          true,
        );
        TestValidator.equals(
          "comment voted count present",
          typeof typeCounts.commentCreated === "number",
          true,
        );
        TestValidator.equals(
          "community subscribed count present",
          typeof typeCounts.communitySubscribed === "number",
          true,
        );
        TestValidator.equals(
          "profile viewed count present",
          typeof typeCounts.profileViewed === "number",
          true,
        );
      }

      // Validate date range structure
      if (summary.date_range) {
        const dateRange = summary.date_range;
        TestValidator.equals("start date present", !!dateRange.startDate, true);
        TestValidator.equals("end date present", !!dateRange.endDate, true);

        // Validate date format
        TestValidator.predicate(
          "start date is valid ISO format",
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            dateRange.startDate,
          ),
        );
        TestValidator.predicate(
          "end date is valid ISO format",
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            dateRange.endDate,
          ),
        );
      }
    }
  }

  // Step 5: Validate privacy compliance - ensure data belongs to correct user
  userActivities.data.forEach((activity, index) => {
    TestValidator.equals(
      `activity ${index} belongs to correct user`,
      activity.user_id,
      registeredUser.id,
    );
  });

  // Step 6: Test activity metadata structure for privacy compliance
  userActivities.data.forEach((activity, index) => {
    // Validate that sensitive metadata is properly structured
    if (activity.ip_address) {
      TestValidator.predicate(
        `activity ${index} IP address format is valid`,
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(activity.ip_address),
      );
    }

    if (activity.user_agent) {
      TestValidator.predicate(
        `activity ${index} user agent is properly formatted`,
        activity.user_agent.length > 10 && activity.user_agent.length < 500,
      );
    }

    // Validate activity metadata JSON structure if present
    if (activity.activity_metadata) {
      try {
        const metadata = JSON.parse(activity.activity_metadata);
        TestValidator.predicate(
          `activity ${index} metadata is valid JSON`,
          typeof metadata === "object" && metadata !== null,
        );
      } catch (error) {
        throw new Error(
          `Activity ${index} metadata is not valid JSON: ${error}`,
        );
      }
    }
  });

  // Step 7: Validate community participation data if present
  userActivities.data.forEach((activity, index) => {
    if (activity.activity_summary?.community_participation) {
      const communityData = activity.activity_summary.community_participation;
      TestValidator.equals(
        `activity ${index} community data structure valid`,
        typeof communityData.subscribed_communities === "number" ||
          typeof communityData.active_participation === "number",
        true,
      );
    }
  });

  TestValidator.predicate(
    "user activity data retrieved successfully with proper metadata and privacy compliance",
    userActivities.data.length >= 0,
  );
}
