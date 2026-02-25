import { ICommunityPlatformFeatureFlagTargetingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagTargetingRule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_feature_flag_targeting_rule(
  input?:
    | DeepPartial<ICommunityPlatformFeatureFlagTargetingRule.ICreate>
    | undefined,
): ICommunityPlatformFeatureFlagTargetingRule.ICreate {
  const ruleKey =
    input?.rule_key ??
    RandomGenerator.pick([
      "user_role",
      "karma_threshold",
      "join_date",
      "post_count",
      "comment_count",
      "community_member",
      "device_type",
      "country",
      "language",
    ] as const);
  const ruleValue = (() => {
    if (input?.rule_value !== undefined) return input.rule_value;
    switch (ruleKey) {
      case "user_role":
        return RandomGenerator.pick([
          "admin",
          "moderator",
          "user",
          "guest",
          "verified",
        ] as const);
      case "karma_threshold":
        return typia
          .random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
          >()
          .toString();
      case "join_date":
        const date = new Date();
        date.setFullYear(
          date.getFullYear() -
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
            >(),
        );
        date.setMonth(
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<11>
          >(),
        );
        date.setDate(
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<28>
          >(),
        );
        return date.toISOString().split("T")[0]; // YYYY-MM-DD format
      case "post_count":
      case "comment_count":
        return typia
          .random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
          >()
          .toString();
      case "community_member":
        return RandomGenerator.pick(["true", "false"] as const);
      case "device_type":
        return RandomGenerator.pick([
          "mobile",
          "desktop",
          "tablet",
          "web",
        ] as const);
      case "country":
        return RandomGenerator.pick([
          "US",
          "GB",
          "CA",
          "AU",
          "DE",
          "FR",
          "JP",
          "KR",
          "CN",
          "IN",
        ] as const);
      case "language":
        return RandomGenerator.pick([
          "en",
          "es",
          "fr",
          "de",
          "ja",
          "ko",
          "zh",
          "ru",
          "pt",
        ] as const);
      default:
        return RandomGenerator.alphaNumeric(8);
    }
  })();
  return {
    rule_key: ruleKey,
    rule_value: ruleValue,
    rule_operator:
      input?.rule_operator ??
      RandomGenerator.pick([
        "equals",
        "not_equals",
        "greater_than",
        "less_than",
        "greater_than_or_equal",
        "less_than_or_equal",
        "contains",
        "not_contains",
        "starts_with",
        "ends_with",
        "regex_match",
        "in",
        "not_in",
      ] as const),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? RandomGenerator.paragraph({ sentences: 2 })
        : null),
    priority:
      input?.priority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    is_active: input?.is_active ?? true,
  };
}
