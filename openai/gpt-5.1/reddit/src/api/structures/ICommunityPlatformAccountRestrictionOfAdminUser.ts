import { tags } from "typia";

import { ICommunityPlatformAdminuser } from "./ICommunityPlatformAdminuser";

export namespace ICommunityPlatformAccountRestrictionOfAdminUser {
  /**
   * Summary view of the linkage between a restriction episode and an
   * administrative user account.
   *
   * This type encapsulates essential fields from
   * `community_platform_account_restrictions_of_adminusers`, which binds a
   * generic restriction episode to a concrete administrative actor in
   * `community_platform_adminusers`.
   *
   * It is embedded into restriction DTOs so that moderation and security
   * interfaces can quickly identify which admin user is subject to the
   * restriction without requiring separate queries.
   */
  export type ISummary = {
    /**
     * Primary key of the admin‑user restriction linkage record.
     *
     * This corresponds to
     * `community_platform_account_restrictions_of_adminusers.id` and
     * uniquely identifies the row that connects a restriction to an admin
     * account.
     *
     * It is mainly useful for debugging and internal reference, rather than
     * as a public business identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Identifier of the restriction episode that applies to the admin user.
     *
     * This field is stored as
     * `community_platform_account_restrictions_of_adminusers.community_platform_account_restriction_id`
     * and references `community_platform_account_restrictions.id`.
     *
     * A unique constraint on this column ensures that each restriction
     * episode is associated with at most one admin account in this
     * subsystem.
     */
    community_platform_account_restriction_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the administrative user account affected by this
     * restriction.
     *
     * The column
     * `community_platform_account_restrictions_of_adminusers.community_platform_adminuser_id`
     * references `community_platform_adminusers.id` and identifies which
     * admin actor is restricted.
     *
     * Security tooling can join on this value to retrieve administrative
     * identity, roles, and other status indicators.
     */
    community_platform_adminuser_id: string & tags.Format<"uuid">;

    /**
     * Timestamp when this admin‑user restriction linkage was created.
     *
     * This value comes from
     * `community_platform_account_restrictions_of_adminusers.created_at`
     * and records when the restriction began applying to the admin
     * account.
     *
     * Audit systems rely on this timestamp to reconstruct enforcement
     * sequences for privileged users.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this linkage record was last modified.
     *
     * The
     * `community_platform_account_restrictions_of_adminusers.updated_at`
     * column is updated when linkage metadata changes, such as status
     * synchronization or administrative corrections.
     *
     * Inspection tools can use this field to highlight recent changes that
     * may impact enforcement or access decisions.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp indicating that the linkage between the
     * restriction and the admin user is no longer active.
     *
     * This mirrors
     * `community_platform_account_restrictions_of_adminusers.deleted_at`
     * and allows the system to deactivate enforcement at the linkage level
     * while retaining historical records.
     *
     * Historical and compliance views can still display soft‑deleted
     * linkages to present a complete picture of how administrative accounts
     * were governed over time.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Summary of the administrative user account affected by this
     * restriction linkage.
     *
     * This association is resolved from `community_platform_adminuser_id`
     * and exposes a compact `ICommunityPlatformAdminUser.ISummary` so that
     * moderation and security interfaces can show the impacted admin
     * without issuing additional queries.
     *
     * The summary keeps the linkage DTO lightweight while still providing
     * enough identity context for privileged account governance workflows.
     */
    adminUser?: ICommunityPlatformAdminuser.ISummary | null | undefined;
  };
}
