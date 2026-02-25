import { ICommunityPlatformFeatureFlagEnvironmentTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_feature_flag_environment_targeting_rule(
  input?: DeepPartial<ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate>,
): ICommunityPlatformFeatureFlagEnvironmentTargetingRule.ICreate {
  const ruleKey =
    input?.rule_key ??
    RandomGenerator.pick([
      "user_role",
      "geo_location",
      "percentage",
      "karma_threshold",
      "account_age",
      "post_count",
      "community_membership",
    ] as const);
  const ruleValue =
    input?.rule_value ??
    (() => {
      switch (ruleKey) {
        case "user_role":
          return RandomGenerator.pick([
            "admin",
            "moderator",
            "user",
            "guest",
          ] as const);
        case "geo_location":
          return RandomGenerator.pick([
            "US",
            "KR",
            "JP",
            "EU",
            "CA",
            "AU",
            "UK",
          ] as const);
        case "percentage":
          return typia
            .random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
            >()
            .toString();
        case "karma_threshold":
          return typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1> &
                tags.Maximum<1000>
            >()
            .toString();
        case "account_age":
          return typia
            .random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<365>
            >()
            .toString();
        case "post_count":
          return typia
            .random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1> &
                tags.Maximum<1000>
            >()
            .toString();
        case "community_membership":
          return RandomGenerator.pick([
            "member",
            "subscriber",
            "banned",
          ] as const);
        default:
          return RandomGenerator.alphaNumeric(8);
      }
    })();
  return {
    rule_key: ruleKey,
    rule_value: ruleValue,
  };
}
