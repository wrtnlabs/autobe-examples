export namespace IPageICommunityPlatformReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   *
   * This schema represents a paginated response for reports. It contains
   * pagination metadata and a list of individual report summary records.
   *
   * The `data` property contains the array of
   * ICommunityPlatformReport.ISummary objects, each representing a single
   * report with essential metadata for moderation workflows. This allows
   * efficient display of report lists in moderation interfaces without
   * exposing full details.
   *
   * This schema does not directly correspond to a database table but is a
   * compound response structure used for API pagination. It references the
   * ICommunityPlatformReport.ISummary schema for its data items.
   */
  export type ISummary = string;
}
